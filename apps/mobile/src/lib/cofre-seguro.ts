import * as SecureStore from "expo-secure-store";

/**
 * `expo-secure-store` que NUNCA lança.
 *
 * Incidente de 21/09/2026 ("a conta do transportador não está entrando,
 * nenhuma — fica na tela azul escrito ROTTA"). O `SecureStore` do
 * Android não é uma leitura de arquivo: ele descriptografa usando uma
 * chave do Keystore do aparelho. Quando essa chave e o dado guardado
 * saem de sincronia, `getItemAsync` LANÇA em vez de devolver `null`.
 * Isso acontece de verdade, e não é raro:
 *
 *  - o backup automático do Android restaura o dado guardado num
 *    aparelho novo, mas a chave do Keystore não é restaurável;
 *  - o usuário cadastra ou remove a biometria/bloqueio de tela, e o
 *    Keystore invalida as chaves ligadas a ele;
 *  - atualização de sistema, ou mudança de aparelho com o mesmo login.
 *
 * O erro não passa: fica gravado no aparelho. Reabrir o app repete o
 * mesmo travamento para sempre — foi por isso que "nenhuma" conta
 * entrava, e não só uma.
 *
 * Aqui uma leitura que falha vira `null` (o mesmo que "não tem nada
 * guardado") e uma escrita que falha vira um aviso no console. Nos dois
 * casos o app segue: perder uma PREFERÊNCIA guardada custa um passo a
 * mais para a pessoa; travar na splash custa o dia de trabalho dela.
 */

export async function lerDoCofre(chave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(chave);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[cofre] Não consegui ler "${chave}". Tratando como vazio.`, error);
    return null;
  }
}

export async function gravarNoCofre(chave: string, valor: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(chave, valor);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[cofre] Não consegui gravar "${chave}".`, error);
    return false;
  }
}

export async function apagarDoCofre(chave: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(chave);
  } catch (error) {
    // Apagar o que já está ilegível é exatamente o que queremos; se nem
    // apagar dá, não há mais nada a fazer aqui.
    // eslint-disable-next-line no-console
    console.warn(`[cofre] Não consegui apagar "${chave}".`, error);
  }
}
