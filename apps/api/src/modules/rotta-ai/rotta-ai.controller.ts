import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ValidateDocumentDto } from "./dto/validate-document.dto";
import { RottaAiService } from "./rotta-ai.service";

@ApiTags("rotta-ai")
@ApiBearerAuth()
@Controller("rotta-ai")
export class RottaAiController {
  constructor(private readonly rottaAiService: RottaAiService) {}

  @Post("validate-document")
  validateDocument(@Body() dto: ValidateDocumentDto) {
    return this.rottaAiService.validateDocument(dto);
  }
}
