import { createResource, ResourceReturn } from "solid-js";
import { DocumentNode, print } from "graphql";
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { access, FalsyValue, MaybeAccessor, Modify } from "@solid-primitives/utils";

export type RequestHeaders = { [key: string]: string };

export type RequestOptions<V extends object = {}> = Modify<
  Omit<RequestInit, "body">,
  {
    headers?: RequestHeaders;
    variables?: V;
    fetcher?: typeof fetch;
    multipart?: boolean;
  }
>;

export type GraphQLClientQuery = {
  <T = unknown, V extends object = {}>(
    query: string | DocumentNode | TypedDocumentNode<T, V>,
    variables: MaybeAccessor<V | FalsyValue> | undefined,
    initialValue: T
  ): ResourceReturn<T>;
  <T = unknown, V extends object = {}>(
    query: string | DocumentNode | TypedDocumentNode<T, V>,
    variables?: MaybeAccessor<V | FalsyValue>,
    initialValue?: undefined
  ): ResourceReturn<T | undefined>;
};

/**
 * Creates a reactive GraphQL query client.
 *
 * @param url URL as string or accessor
 * @param options Options that will be applied to all the subsequent requests
 * @returns Returns a query generator the produces Solid resources for queries
 *
 * @see https://github.com/solidjs-community/solid-primitives/tree/main/packages/graphql#how-to-use-it
 *
 * @example
 * ```ts
 * const newQuery = createGraphQLClient("https://foobar.com/v1/api", { authorization: "Bearer mytoken" });
 * ```
 */
export const createGraphQLClient =
  (url: MaybeAccessor<string>, options?: Omit<RequestOptions, "variables">): GraphQLClientQuery =>
    (query, variables: any = {}, initialValue) =>
      createResource(
        () => access(variables),
        (vars: any) => {
          const variables = typeof vars === "boolean" ? {} : vars;
          return request(access(url), query, { ...options, variables });
        },
        { initialValue }
      );

/**
 * Performs a GraphQL fetch to provided endpoint.
 *
 * @param url target api endpoint
 * @param query GraphQL query string *(use `gql` function or `DocumentNode`/`TypedDocumentNode` type)*
 * @param options config object where you can specify query variables, request headers, method, etc.
 * @returns a Promise resolving in JSON value if the request was successful
 */
export async function request<T = any, V extends object = {}>(
  url: string,
  query: string | DocumentNode | TypedDocumentNode<T, V>,
  options: RequestOptions<V> = {}
): Promise<T> {
  const { fetcher = fetch, variables = {}, headers = {}, method = "POST" } = options;
  const query_ = typeof query == "string" ? query : print(query);

  const fetched = options.multipart ?
    fetcher(url, {
      ...options,
      method: 'POST',
      body: makeMultipartBody(query_, variables),
      headers: {
        "content-type": "multipart/form-data",
        ...headers
      }
    }) :
    fetcher(url, {
      ...options,
      method,
      body: JSON.stringify({ query: query_, variables }),
      headers: {
        "content-type": "application/json",
        ...headers
      }
    });

  return fetched
    .then((r: any) => r.json())
    .then(({ data, errors }: any) => {
      if (errors) throw errors;
      return data;
    });
}

export function makeMultipartBody(query: string, variables: any) {
  const parts: { blob: Blob, path: string }[] = [];

  // We don't want to modify the variables passed in as arguments
  // so we do a deep copy and we replace instances of Blobs with
  // a null and generate the correct object-path as we go.

  function copyValue(r: any, k: string | number, v: any, path: (string | number)[]) {
    if (v instanceof Blob) {
      parts.push({
        blob: v,
        path: path.join(".") + "." + k
      });
      r[k] = null;
    }
    else {
      if (typeof v === 'object') {
        path.push(k);
        r[k] = Array.isArray(v) ? copyArray(v, path) : copyObject(v, path);
        path.pop();
      }
      else {
        r[k] = v;
      }
    }
  }

  function copyObject(obj: any, path: (string | number)[]) {
    const r: any = {};
    for (const k of Object.getOwnPropertyNames(obj)) {
      copyValue(r, k, obj[k], path);
    }
    return r;
  }

  function copyArray(arr: any, path: (string | number)[]) {
    const r: any[] = [];
    for (let i = 0; i < arr.length; i++) {
      copyValue(r, i, arr[i], path);
    }
    return r;
  }

  variables = copyObject(variables, ['variables']);

  const formData = new FormData();
  formData.append("operations", JSON.stringify({ query, variables }));
  formData.append("map", JSON.stringify(Object.fromEntries(parts.map((x, i) => [`${i}`, x.path]))));
  for (let i = 0; i < parts.length; i++) {
    formData.append(`${i}`, parts[i].blob);
  }
  return formData;
}

/**
 * Creates a GraphQL query string.
 */
export const gql = (query: TemplateStringsArray) =>
  query
    .join(" ")
    .replace(/#.+\r?\n|\r/g, "")
    .replace(/\r?\n|\r/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
