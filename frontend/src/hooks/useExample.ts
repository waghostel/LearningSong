import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'

// Example data type
interface ExampleData {
  id: number
  title: string
  description: string
}

// Example API endpoints
const EXAMPLE_ENDPOINTS = {
  list: '/api/examples',
  detail: (id: number) => `/api/examples/${id}`,
  create: '/api/examples',
  update: (id: number) => `/api/examples/${id}`,
  delete: (id: number) => `/api/examples/${id}`,
}

// Query keys
export const exampleKeys = {
  all: ['examples'] as const,
  lists: () => [...exampleKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...exampleKeys.lists(), filters] as const,
  details: () => [...exampleKeys.all, 'detail'] as const,
  detail: (id: number) => [...exampleKeys.details(), id] as const,
}

// Fetch all examples
export const useExamples = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: exampleKeys.list(filters),
    queryFn: async () => {
      const data = await apiClient.get<ExampleData[]>(EXAMPLE_ENDPOINTS.list, {
        params: filters,
      })
      return data
    },
  })
}

// Fetch single example
export const useExample = (id: number) => {
  return useQuery({
    queryKey: exampleKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<ExampleData>(EXAMPLE_ENDPOINTS.detail(id))
      return data
    },
    enabled: !!id, // Only run if id is provided
  })
}

// Create example mutation
export const useCreateExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newExample: Omit<ExampleData, 'id'>) => {
      const data = await apiClient.post<ExampleData>(EXAMPLE_ENDPOINTS.create, newExample)
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch examples list
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
    },
  })
}

// Update example mutation
export const useUpdateExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExampleData> }) => {
      const result = await apiClient.put<ExampleData>(EXAMPLE_ENDPOINTS.update(id), data)
      return result
    },
    onSuccess: (_, variables) => {
      // Invalidate specific example and list
      queryClient.invalidateQueries({ queryKey: exampleKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
    },
  })
}

// Delete example mutation
export const useDeleteExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(EXAMPLE_ENDPOINTS.delete(id))
      return id
    },
    onSuccess: () => {
      // Invalidate examples list
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
    },
  })
}
