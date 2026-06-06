import { queryOptions, type QueryKey, type UseQueryOptions } from '@tanstack/react-query'

export interface EdenErrorValue {
  error?: string
  message?: string
  authenticated?: false
}

export interface EdenError {
  status: number | string
  value: EdenErrorValue
}

type EdenRawResponse<TData> =
  | {
      data: TData
      error: null
      response: Response
      status: number
    }
  | {
      data: null
      error: {
        status: unknown
        value: unknown
      }
      response: Response
      status: number
    }

type BaseEdenQueryOptionInput<TResponseData, TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<TData, Error, TData, TQueryKey>,
  'queryFn' | 'queryKey'
> & {
  mapData: (data: TResponseData) => TData | Promise<TData>
  mapErrorData?: (error: EdenError, response: Response, status: number) => TData | undefined
  queryKey: TQueryKey
  toError?: (error: EdenError, response: Response, status: number) => Error
}

type EdenQueryOptionWithoutOptions<TResponseData, TData, TQueryKey extends QueryKey> =
  BaseEdenQueryOptionInput<TResponseData, TData, TQueryKey> & {
    edenOptions?: undefined
    edenQuery: () => Promise<EdenRawResponse<TResponseData>>
  }

type EdenQueryOptionWithOptions<
  TOptions,
  TResponseData,
  TData,
  TQueryKey extends QueryKey,
> = BaseEdenQueryOptionInput<TResponseData, TData, TQueryKey> & {
  edenOptions: TOptions
  edenQuery: (options: TOptions) => Promise<EdenRawResponse<TResponseData>>
}

type EdenQueryOptionInput<TOptions, TResponseData, TData, TQueryKey extends QueryKey> =
  | EdenQueryOptionWithoutOptions<TResponseData, TData, TQueryKey>
  | EdenQueryOptionWithOptions<TOptions, TResponseData, TData, TQueryKey>

export function edenQueryOption<
  TResponseData,
  TData = TResponseData,
  TQueryKey extends QueryKey = QueryKey,
>(
  input: EdenQueryOptionWithoutOptions<TResponseData, TData, TQueryKey>,
): UseQueryOptions<TData, Error, TData, TQueryKey>
export function edenQueryOption<
  TOptions,
  TResponseData,
  TData = TResponseData,
  TQueryKey extends QueryKey = QueryKey,
>(
  input: EdenQueryOptionWithOptions<TOptions, TResponseData, TData, TQueryKey>,
): UseQueryOptions<TData, Error, TData, TQueryKey>
export function edenQueryOption<
  TOptions,
  TResponseData,
  TData = TResponseData,
  TQueryKey extends QueryKey = QueryKey,
>({
  edenQuery,
  edenOptions,
  mapData,
  mapErrorData,
  queryKey,
  toError,
  ...options
}: EdenQueryOptionInput<TOptions, TResponseData, TData, TQueryKey>): UseQueryOptions<
  TData,
  Error,
  TData,
  TQueryKey
> {
  return queryOptions({
    ...options,
    queryKey,
    queryFn: async () => {
      const result =
        edenOptions === undefined
          ? await (edenQuery as () => Promise<EdenRawResponse<TResponseData>>)()
          : await (edenQuery as (options: TOptions) => Promise<EdenRawResponse<TResponseData>>)(
              edenOptions,
            )

      if (result.error) {
        const error = toEdenError(result.error)
        const mappedErrorData = mapErrorData?.(error, result.response, result.status)

        if (mappedErrorData !== undefined) {
          return mappedErrorData
        }

        throw toError?.(error, result.response, result.status) ?? toDefaultError(error, result.response)
      }

      return await mapData(result.data)
    },
  })
}

const toDefaultError = (error: EdenError, response: Response): Error => {
  return new Error(error.value.message ?? error.value.error ?? response.statusText)
}

const toEdenError = (error: { status: unknown; value: unknown }): EdenError => {
  return {
    status:
      typeof error.status === 'number' || typeof error.status === 'string'
        ? error.status
        : 'unknown',
    value: isEdenErrorValue(error.value) ? error.value : {},
  }
}

const isEdenErrorValue = (value: unknown): value is EdenErrorValue => {
  return typeof value === 'object' && value !== null
}
