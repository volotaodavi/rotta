import { Injectable, ParseUUIDPipe } from "@nestjs/common";

/**
 * Pipe de validacao de identificadores UUID em parametros de rota (ex.
 * `/students/:id`) — reexportado com um nome proprio para uso consistente
 * em toda a API (Dossie 12, Secao 3).
 */
@Injectable()
export class ParseUuidPipe extends ParseUUIDPipe {
  constructor() {
    super({ version: "4" });
  }
}
