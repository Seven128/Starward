import {
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { MiniappService } from "./miniapp-service.ts";

@Controller("__acceptance")
export class AcceptanceController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  @Post("reset")
  async reset(@Headers("x-acceptance-token") token = "") {
    const expected = process.env.MINIAPP_ACCEPTANCE_TOKEN ?? "";
    if (
      process.env.MINIAPP_ACCEPTANCE_MODE !== "1" ||
      expected.length < 20 ||
      token !== expected
    )
      throw new NotFoundException("acceptance_control_unavailable");
    await this.service.resetAcceptanceState();
    return { status: "reset", storage: "memory" };
  }
}
