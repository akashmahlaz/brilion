import { WaAuth } from "../models/wa-auth";
import { connectDB } from "../db";
import type {
  AuthenticationCreds,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

export async function useMongoAuthState() {
  await connectDB();

  const readData = async (id: string) => {
    const doc = await WaAuth.findById(id).lean();
    return doc ? JSON.parse(JSON.stringify((doc as any).data), BufferJSON.reviver) : null;
  };

  const writeData = async (id: string, data: unknown) => {
    const serialized = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
    await WaAuth.findByIdAndUpdate(
      id,
      { data: serialized },
      { upsert: true }
    );
  };

  const removeData = async (id: string) => {
    await WaAuth.findByIdAndDelete(id);
  };

  const creds: AuthenticationCreds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ) => {
          const data: Record<string, SignalDataTypeMap[T]> = {};
          for (const id of ids) {
            const value = await readData(`keys:${type}:${id}`);
            if (value) {
              if (type === "app-state-sync-key" && value.keyData) {
                data[id] =
                  proto.Message.AppStateSyncKeyData.fromObject(
                    value
                  ) as any;
              } else {
                data[id] = value;
              }
            }
          }
          return data;
        },
        set: async (data: Record<string, Record<string, unknown>>) => {
          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries || {})) {
              const key = `keys:${category}:${id}`;
              if (value) {
                await writeData(key, value);
              } else {
                await removeData(key);
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      await writeData("creds", creds);
    },
    clearState: async () => {
      await WaAuth.deleteMany({});
    },
  };
}
