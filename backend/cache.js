/**
 * Cache em memoria simples com TTL, usado nas rotas GET.
 * Nao precisa de dependencia externa (Redis etc.) para o volume de dados
 * deste app (12 temas + 371 itens).
 */

const store = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60s

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Remove todas as entradas cujo prefixo de chave bate com algum dos informados. */
function invalidate(prefixes = []) {
  for (const key of store.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      store.delete(key);
    }
  }
}

function clear() {
  store.clear();
}

module.exports = { get, set, invalidate, clear };
