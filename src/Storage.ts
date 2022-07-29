import fs from "fs";
import { defaultState, State } from "./State";

export class Storage {
  readonly filePath: string;
  private _state: State = defaultState;

  constructor(name: string) {
    this.filePath = `./state/${name}.json`;

    if (!fs.existsSync(this.filePath)) {
      this._state = defaultState;
    } else {
      this._state = JSON.parse(fs.readFileSync(this.filePath).toString());
    }
  }

  get state(): State {
    return this._state;
  }

  set state(newState: State) {
    fs.writeFileSync(this.filePath, JSON.stringify(newState));

    this._state = newState;
  }
}
