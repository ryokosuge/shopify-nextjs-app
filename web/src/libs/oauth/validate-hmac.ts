import { NextRequest } from "next/server";

export type ValidateHMACInput = {
  request: NextRequest;
  apiSecret: string;
};
export const validateHMAC = async ({
  request,
  apiSecret,
}: ValidateHMACInput): Promise<boolean> => {
  // check HMAC
  const url = request.nextUrl.clone();
  const hmac = url.searchParams.get("hmac");
  if (hmac == null) {
    return false;
  }

  url.searchParams.delete("hmac");
  const message = url.searchParams.toString();
  const cryptoLib =
    typeof (crypto as any)?.webcrypto === "undefined"
      ? (crypto as any)
      : (crypto as any).webcrypto;

  let hash: string;
  if (cryptoLib.subtle) {
    const enc = new TextEncoder();
    const key = await cryptoLib.subtle.importKey(
      "raw",
      enc.encode(apiSecret),
      {
        name: "HMAC",
        hash: { name: "SHA-256" },
      },
      false,
      ["sign"],
    );
    const signature = await cryptoLib.subtle.sign(
      "HMAC",
      key,
      enc.encode(message),
    );
    hash = asHex(signature);
  } else {
    hash = cryptoLib
      .createHmac("sha256", apiSecret)
      .update(message, "utf-8")
      .digest("base64");
  }

  return safeCompare(hmac, hash);
};

/**
 * A timing safe string comparison utility.
 *
 * @param strA any string, array of strings, or object with string values
 * @param strB any string, array of strings, or object with string values
 */
const safeCompare = (strA: string, strB: string): boolean => {
  if (typeof strA !== typeof strB) {
    return false;
  }

  const buffA = Buffer.from(strA);
  const buffB = Buffer.from(strB);

  if (buffA.length === buffB.length) {
    return timingSafeEqual(buffA, buffB);
  }

  return false;
};

// Buffer must be same length for this function to be secure.
function timingSafeEqual(bufA: ArrayBuffer, bufB: ArrayBuffer): boolean {
  const viewA = new Uint8Array(bufA);
  const viewB = new Uint8Array(bufB);
  let out = 0;
  for (let i = 0; i < viewA.length; i++) {
    out |= viewA[i] ^ viewB[i];
  }
  return out === 0;
}

export function asHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
