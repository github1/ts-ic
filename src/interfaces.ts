export type Selector = any;

export interface ICRegistrateable {
  register(selector : Selector, injectable : any) : ICC;
}

export interface ICCreator{
  create<T>(selector : Selector) : Promise<T>;
}

export interface ICInterrogatable {
  hasSelector(selector : Selector) : boolean;
}

export interface ICC extends ICCreator, ICInterrogatable, ICRegistrateable {
  wire<T>(t : any) : Promise<T>;
  scope(scope : () => void | Promise<any>) : Promise<ICC>;
  withConfig(...config : any[]) : ICC;
}
