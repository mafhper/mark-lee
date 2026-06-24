import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import { listEntries } from "../domain/entry-service";
import type { JournalSessionState, JournalSessionAction } from "./journalSession.types";

function sessionReducer(state: JournalSessionState, action: JournalSessionAction): JournalSessionState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, rootPath: action.rootPath, loadId: action.loadId, loading: true, loadProgress: null, entries: [], fileErrors: [], activeEntryId: null };
    case "LOAD_PROGRESS":
      return { ...state, loadProgress: { loaded: action.loaded, total: action.total } };
    case "LOAD_COMPLETE":
      if (state.loadId !== action.loadId) return state;
      return {
        ...state, loading: false, loadProgress: null,
        entries: action.entries, fileErrors: action.fileErrors, revision: state.revision + 1,
        activeEntryId: action.entries.some((e) => e.metadata.id === state.activeEntryId)
          ? state.activeEntryId : null,
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, loadProgress: null };
    case "ADD_ENTRY":
      return { ...state, entries: [action.entry, ...state.entries], revision: state.revision + 1 };
    case "UPDATE_ENTRY":
      return { ...state, entries: state.entries.map((e) => e.metadata.id === action.entry.metadata.id ? action.entry : e), revision: state.revision + 1 };
    case "REMOVE_ENTRY":
      return {
        ...state,
        entries: state.entries.filter((e) => e.metadata.id !== action.entryId),
        activeEntryId: state.activeEntryId === action.entryId ? null : state.activeEntryId,
        revision: state.revision + 1,
      };
    case "INCREMENT_REVISION":
      return { ...state, revision: state.revision + 1 };
    case "SET_ACTIVE_ENTRY":
      return { ...state, activeEntryId: action.entryId };
    default:
      return state;
  }
}

const initialState: JournalSessionState = {
  rootPath: null,
  entries: [],
  fileErrors: [],
  revision: 0,
  loading: false,
  loadProgress: null,
  activeEntryId: null,
  loadId: 0,
};

interface JournalSessionContextValue {
  state: JournalSessionState;
  dispatch: React.Dispatch<JournalSessionAction>;
  loadJournal: (rootPath: string) => Promise<void>;
}

const JournalSessionContext = createContext<JournalSessionContextValue | null>(null);

let nextLoadId = 0;

export function JournalSessionProvider({ children, rootPath }: { children: ReactNode; rootPath: string | null }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const lastRootRef = useRef<string | null>(null);

  const loadJournal = useCallback(async (path: string) => {
    const loadId = ++nextLoadId;
    dispatch({ type: "LOAD_START", rootPath: path, loadId });
    try {
      const result = await listEntries(path, (loaded, total) => {
        dispatch({ type: "LOAD_PROGRESS", loaded, total });
      });
      dispatch({ type: "LOAD_COMPLETE", entries: result.entries, fileErrors: result.errors, loadId });
    } catch {
      dispatch({ type: "LOAD_ERROR" });
    }
  }, []);

  useEffect(() => {
    if (rootPath && rootPath !== lastRootRef.current) {
      lastRootRef.current = rootPath;
      loadJournal(rootPath);
    }
    if (!rootPath) {
      lastRootRef.current = null;
      dispatch({ type: "LOAD_START", rootPath: "", loadId: ++nextLoadId });
      dispatch({ type: "LOAD_COMPLETE", entries: [], fileErrors: [], loadId: nextLoadId });
    }
  }, [rootPath, loadJournal]);

  return (
    <JournalSessionContext.Provider value={{ state, dispatch, loadJournal }}>
      {children}
    </JournalSessionContext.Provider>
  );
}

export function useJournalSession(): JournalSessionContextValue {
  const ctx = useContext(JournalSessionContext);
  if (!ctx) throw new Error("useJournalSession must be used within a JournalSessionProvider");
  return ctx;
}
