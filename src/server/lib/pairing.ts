import { randomInt } from "crypto";
import { Pairing } from "../models/pairing";
import { loadConfig, saveConfig } from "./config";

const log = (...args: unknown[]) => console.log("[pairing]", ...args);

const CODE_LENGTH = 8;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_PENDING_PER_USER = 10;

function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Issue a pairing challenge for an unknown sender.
 * Returns the code and a message to send to the sender.
 * If a pending request already exists for this sender, returns it.
 */
export async function issuePairingChallenge(opts: {
  userId: string;
  channel: "whatsapp" | "telegram";
  senderId: string;
  senderName?: string;
}): Promise<{ code: string; message: string; alreadyPending: boolean }> {
  const { userId, channel, senderId, senderName } = opts;

  // Check for existing pending request
  const existing = await Pairing.findOne({
    userId,
    channel,
    senderId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (existing) {
    log("Existing pairing request for", senderId, "code:", existing.code);
    return {
      code: existing.code,
      message: buildPairingMessage(channel, senderId, existing.code),
      alreadyPending: true,
    };
  }

  // Enforce max pending per user
  const pendingCount = await Pairing.countDocuments({
    userId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (pendingCount >= MAX_PENDING_PER_USER) {
    // Expire the oldest pending request
    await Pairing.findOneAndUpdate(
      { userId, status: "pending" },
      { status: "expired" },
      { sort: { createdAt: 1 } }
    );
  }

  const code = generateCode();
  await Pairing.create({
    userId,
    channel,
    senderId,
    senderName,
    code,
    status: "pending",
    expiresAt: new Date(Date.now() + PENDING_TTL_MS),
  });

  log("Issued pairing code", code, "for", senderId, "on", channel);

  return {
    code,
    message: buildPairingMessage(channel, senderId, code),
    alreadyPending: false,
  };
}

/**
 * Approve a pairing request by code.
 * Adds the sender to the channel's allowFrom list in config.
 */
export async function approvePairing(opts: {
  userId: string;
  code: string;
}): Promise<{
  ok: boolean;
  senderId?: string;
  senderName?: string;
  channel?: string;
  error?: string;
}> {
  const { userId, code } = opts;

  const request = await Pairing.findOne({
    userId,
    code: code.toUpperCase(),
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!request) {
    return { ok: false, error: "Invalid or expired pairing code." };
  }

  request.status = "approved";
  await request.save();

  // Add sender to config allowFrom
  const config = await loadConfig(userId);
  const channelKey = request.channel as "whatsapp" | "telegram";
  const allowFrom = config.channels?.[channelKey]?.allowFrom || [];
  if (!allowFrom.includes(request.senderId)) {
    allowFrom.push(request.senderId);
    if (!config.channels) config.channels = {};
    if (!config.channels[channelKey]) config.channels[channelKey] = {};
    config.channels[channelKey].allowFrom = allowFrom;
    await saveConfig(config);
  }

  log("Approved pairing:", request.senderId, "on", request.channel);

  return {
    ok: true,
    senderId: request.senderId,
    senderName: request.senderName,
    channel: request.channel,
  };
}

/**
 * Reject a pairing request by code.
 */
export async function rejectPairing(opts: {
  userId: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await Pairing.findOneAndUpdate(
    {
      userId: opts.userId,
      code: opts.code.toUpperCase(),
      status: "pending",
    },
    { status: "rejected" }
  );

  if (!result) {
    return { ok: false, error: "Invalid or expired pairing code." };
  }

  log("Rejected pairing:", result.senderId);
  return { ok: true };
}

/**
 * List pending pairing requests for a user.
 */
export async function listPendingPairings(userId: string) {
  return Pairing.find({
    userId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

function buildPairingMessage(
  channel: string,
  senderId: string,
  code: string
): string {
  return [
    "🔐 Brilion: Access not configured for your number.",
    "",
    `Your ${channel} ID: ${senderId}`,
    "",
    `Pairing code: *${code}*`,
    "",
    "Ask the bot owner to approve your access from the Brilion dashboard,",
    "or share this code with them.",
    "",
    "This code expires in 1 hour.",
  ].join("\n");
}
