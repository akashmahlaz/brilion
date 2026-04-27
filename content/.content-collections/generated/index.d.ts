import configuration from "../../content-collections.ts";
import { GetTypeByName } from "@content-collections/core";

export type Speaker = GetTypeByName<typeof configuration, "speakers">;
export declare const allSpeakers: Array<Speaker>;

export type Talk = GetTypeByName<typeof configuration, "talks">;
export declare const allTalks: Array<Talk>;

export {};
