import "server-only";
import { cache } from "react";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";

export const api = createCaller(cache(createContext));
