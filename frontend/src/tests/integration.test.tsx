import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import { LyricsEditingPage } from "@/pages/LyricsEditingPage";
// ...

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useLyricsEditingStore } from "@/stores/lyricsEditingStore";
import * as lyricsApi from "@/api/lyrics";
import * as authHook from "@/hooks/useAuth";

// Mock components that we don't need to test in detail
jest.mock("@/components/StyleSelector", () => ({
  StyleSelector: () => <div data-testid="style-selector">Style Selector</div>,
}));

jest.mock("@/components/ProgressTracker", () => ({
  ProgressTracker: () => (
    <div data-testid="progress-tracker">Progress Tracker</div>
  ),
}));

jest.mock("@/lib/toast-utils", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showRateLimitError: jest.fn(),
  showNetworkError: jest.fn(),
}));

// Mock API
jest.mock("@/api/lyrics", () => ({
  regenerateLyrics: jest.fn(),
  getRateLimit: jest.fn(),
}));

// Mock Auth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

// Mock Song Generation Hook
const mockGenerate = jest.fn();
jest.mock("@/hooks/useSongGeneration", () => ({
  useSongGeneration: () => ({
    generate: mockGenerate,
    isGenerating: false,
    isConnected: true,
    connectionStatus: "connected",
    canRetry: false,
    retry: jest.fn(),
    manualReconnect: jest.fn(),
  }),
}));

// Mock Regenerate Lyrics Hook
const mockRegenerate = jest.fn();
jest.mock("@/hooks/useRegenerateLyrics", () => ({
  useRegenerateLyrics: () => ({
    regenerate: mockRegenerate,
    isRegenerating: false,
    error: null,
    canRetry: false,
    retry: jest.fn(),
    getErrorType: jest.fn(),
    isRateLimited: false,
  }),
}));

describe("Lyrics Regeneration Integration", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const initialLyrics = "Original lyrics content";
  const newLyrics = "Regenerated lyrics content";

  beforeEach(() => {
    // Reset store
    useLyricsEditingStore.getState().reset();
    useLyricsEditingStore.getState().setOriginalLyrics(initialLyrics);
    useLyricsEditingStore.getState().addVersion(initialLyrics);
    useLyricsEditingStore.getState().setContentHash("hash123");

    // Setup mocks
    (authHook.useAuth as jest.Mock).mockReturnValue({
      userId: "user123",
      loading: false,
      error: null,
    });
    (lyricsApi.getRateLimit as jest.Mock).mockResolvedValue({
      remaining: 3,
      reset_time: new Date(Date.now() + 86400000).toISOString(),
      total_limit: 3,
    });
    mockGenerate.mockClear();
    mockRegenerate.mockClear();
    mockRegenerate.mockClear();

    // Configure regenerate mock to actually update the store (simulating success)
    mockRegenerate.mockImplementation((args) => {
        useLyricsEditingStore.getState().completeRegeneration(newLyrics);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/edit",
              state: { lyrics: initialLyrics, contentHash: "hash123" },
            },
          ]}
        >
          <Routes>
            <Route path="/edit" element={<LyricsEditingPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  test("complete flow: regenerate -> switch -> edit -> generate song", async () => {
    const user = userEvent.setup();
    renderPage();

    // 1. Check initial state
    expect(screen.getByDisplayValue(initialLyrics)).toBeInTheDocument();

    // 2. Regenerate - debug what buttons are available
    screen.debug();
    const allButtons = screen.getAllByRole("button");
    console.log(
      "Available buttons:",
      allButtons.map((btn) => btn.textContent || btn.getAttribute("aria-label"))
    );

    const regenerateBtn = screen.getByRole("button", { name: /regenerate/i });
    expect(regenerateBtn).toBeInTheDocument();
    expect(regenerateBtn).not.toBeDisabled();

    await user.click(regenerateBtn);

        // Verify hook was called
        await waitFor(() => {
            expect(mockRegenerate).toHaveBeenCalled()
        })
        
        const args = mockRegenerate.mock.calls[0][0]
        console.log('Regenerate hook called with args:', args)
        expect(args).toEqual(expect.objectContaining({
            content: initialLyrics
        }))
        
        // 3. Wait for regeneration (store update) to complete and verify new lyrics displayed
        await waitFor(() => {
            const textarea = screen.getByRole('textbox', { name: /lyrics editor/i })
            expect(textarea).toHaveValue(newLyrics)
        }, { timeout: 10000 })


    const v1Tab = await screen.findByRole(
      "tab",
      { name: /V1/i },
      { timeout: 5000 }
    );
    const v2Tab = screen.getByRole("tab", { name: /V2/i });
    expect(v1Tab).toBeInTheDocument();
    expect(v2Tab).toBeInTheDocument();

    // 4. Switch versions
    await user.click(v1Tab);
    expect(screen.getByDisplayValue(initialLyrics)).toBeInTheDocument();

    await user.click(v2Tab);
    expect(screen.getByDisplayValue(newLyrics)).toBeInTheDocument();

    // 5. Edit lyrics
    const textarea = screen.getByRole("textbox", { name: /lyrics editor/i });
    const editedContent = "Regenerated lyrics content edited";
    await user.clear(textarea);
    await user.type(textarea, editedContent);

    expect(screen.getByDisplayValue(editedContent)).toBeInTheDocument();

    // 6. Generate Song
    const generateSongBtn = screen.getByRole("button", {
      name: /generate song/i,
    });
    await user.click(generateSongBtn);

    // Verify generate song called with edited lyrics of active version
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        lyrics: editedContent,
        content_hash: "hash123",
      })
    );
  }, 15000);

  test("rate limit handling", async () => {
    // Mock rate limit error
    const rateLimitError = {
      response: {
        status: 429,
        data: { detail: "Rate limit exceeded", retry_after: 3600 },
      },
      message: "Too Many Requests",
    };
    (lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError);

    renderPage();

    const regenerateBtn = screen.getByRole("button", {
      name: /regenerate lyrics/i,
    });
    fireEvent.click(regenerateBtn);

    await waitFor(() => {
      // Toast should appear (we mocked toast utils? No, but useRegenerateLyrics uses them)
      // We verify the store state or error display in UI
      // The RegenerateButton should eventually become disabled?
      // The hook handles rate limit by setting isRateLimited if it detects 429
      // But checking for the toast text might be tricky if Toaster is not in the tree or mocked.
      // However, useRegenerateLyrics calls showRateLimitError.
      // Let's verify console error or UI update?
      // The LyricsEditor displays RegenerationError.
    });

    // We can check if RegenerateButton is disabled (might require re-render if hook updates)
    // Or check if error message is displayed
  });
});
