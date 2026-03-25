from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pattern.commands import execute_command, make_default_pattern, CommandError
from pattern.renderer import render

app = FastAPI(title="Yoko Pattern API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory pattern state
_pattern = make_default_pattern()


class CommandRequest(BaseModel):
    commands: list[dict]


@app.get("/pattern/svg")
def get_svg():
    return {"svg": render(_pattern)}


@app.post("/pattern/command")
def post_command(req: CommandRequest):
    applied = []
    errors = []
    for cmd in req.commands:
        try:
            execute_command(_pattern, cmd)
            applied.append(cmd)
        except CommandError as e:
            errors.append({"command": cmd, "error": str(e)})
        except (KeyError, ValueError) as e:
            errors.append({"command": cmd, "error": f"Invalid command data: {e}"})
    return {"svg": render(_pattern), "applied": applied, "errors": errors}


@app.post("/pattern/reset")
def reset_pattern():
    execute_command(_pattern, {"action": "reset"})
    return {"svg": render(_pattern)}
