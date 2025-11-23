import { create } from 'zustand'

interface ExampleState {
  count: number
  message: string
  isLoading: boolean
  increment: () => void
  decrement: () => void
  setMessage: (message: string) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  count: 0,
  message: 'Hello from Zustand!',
  isLoading: false,
}

export const useExampleStore = create<ExampleState>((set) => ({
  ...initialState,
  
  increment: () => set((state) => ({ count: state.count + 1 })),
  
  decrement: () => set((state) => ({ count: state.count - 1 })),
  
  setMessage: (message: string) => set({ message }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  reset: () => set(initialState),
}))
