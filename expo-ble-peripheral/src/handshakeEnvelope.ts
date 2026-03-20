export type HandshakeEnvelope = {
  version: number;
  messageType: string;
  sessionId: string;
  payload: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export const MAX_HANDSHAKE_BYTES = 512;
function b64DecodeUnicode(str: string) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}
export function parseHandshakeEnvelope(base64Payload: string): HandshakeEnvelope {
  let decoded: unknown;
  try {
    decoded = JSON.parse(b64DecodeUnicode(base64Payload));
  } catch(e) {
    throw new Error('ERR_MALFORMED_HANDSHAKE: message must be valid JSON');
  }

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('ERR_MALFORMED_HANDSHAKE: envelope must be an object');
  }

  const envelope = decoded as Partial<HandshakeEnvelope>;
  if (!Number.isInteger(envelope.version) || (envelope.version ?? 0) <= 0) {
    throw new Error('ERR_MALFORMED_HANDSHAKE: version must be a positive integer');
  }
  if (!envelope.messageType || typeof envelope.messageType !== 'string') {
    throw new Error('ERR_MALFORMED_HANDSHAKE: messageType is required');
  }
  if (!envelope.sessionId || typeof envelope.sessionId !== 'string' || !UUID_PATTERN.test(envelope.sessionId)) {
    throw new Error('ERR_MALFORMED_HANDSHAKE: sessionId must be a UUID');
  }
  if (!envelope.payload || typeof envelope.payload !== 'string' || !BASE64_PATTERN.test(envelope.payload)) {
    throw new Error('ERR_MALFORMED_HANDSHAKE: payload must be base64');
  }

  return envelope as HandshakeEnvelope;
}
