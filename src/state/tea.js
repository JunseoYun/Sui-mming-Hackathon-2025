import { useCallback, useState } from "react";

export const initialModel = {
  language: "ko",
  currentPage: "home",
  systemMessage: null,
  showChainLog: false,
  adventureSelection: [],
  pvpSelection: [],
};

export const TeaMsg = {
  SetLanguage: (lang) => ({ type: "SetLanguage", lang }),
  Navigate: (page) => ({ type: "Navigate", page }),
  SetSystemMessage: (message) => ({ type: "SetSystemMessage", message }),
  ClearSystemMessage: () => ({ type: "ClearSystemMessage" }),
  ToggleChainLog: () => ({ type: "ToggleChainLog" }),
  SetShowChainLog: (value) => ({ type: "SetShowChainLog", value: !!value }),
  SetAdventureSelection: (selection) => ({ type: "SetAdventureSelection", selection: Array.isArray(selection) ? selection.slice(0, 4) : [] }),
  SetPvpSelection: (selection) => ({ type: "SetPvpSelection", selection: Array.isArray(selection) ? selection.slice(0, 4) : [] }),
};

export function update(model, msg) {
  switch (msg?.type) {
    case "SetLanguage":
      return { ...model, language: msg.lang === "en" ? "en" : "ko" };
    case "Navigate":
      return { ...model, currentPage: msg.page || "home", systemMessage: null };
    case "SetSystemMessage":
      return { ...model, systemMessage: msg.message || null };
    case "ClearSystemMessage":
      return { ...model, systemMessage: null };
    case "ToggleChainLog":
      return { ...model, showChainLog: !model.showChainLog };
    case "SetShowChainLog":
      return { ...model, showChainLog: !!msg.value };
    case "SetAdventureSelection":
      return { ...model, adventureSelection: Array.isArray(msg.selection) ? msg.selection.slice(0, 4) : [] };
    case "SetPvpSelection":
      return { ...model, pvpSelection: Array.isArray(msg.selection) ? msg.selection.slice(0, 4) : [] };
    default:
      return model;
  }
}

export function useTea(initial = initialModel) {
  const [model, setModel] = useState(initial);
  const dispatch = useCallback((msg) => {
    setModel((prev) => update(prev, msg));
  }, []);
  return [model, dispatch];
}


