/**
 * @rotta/storage — abstracao de armazenamento local (Dossie 22, Secao 5.13).
 *
 * Cada app nao decide diretamente qual mecanismo de storage usar —
 * consome a interface deste pacote, que por tras usa `expo-sqlite`/
 * AsyncStorage no mobile e `localStorage`/IndexedDB no web.
 *
 * Uso previsto mais critico (Dossie 14, Secao 1.7): a fila local de
 * eventos de GPS/checklist do app do motorista, que garante que nenhuma
 * acao de campo dependa de conectividade — a implementar junto com o
 * modulo de GPS real.
 *
 * Nenhuma logica implementada ainda (fase de fundacao).
 */

export {};
