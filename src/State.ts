export interface State {
  shown: string[];
  lastVisitAt?: number;
}

export const defaultState: State = {
  shown: [],
};
