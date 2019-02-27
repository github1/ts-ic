import {InjectionContext, Selector} from './interfaces';

export const createParams = (injectionContext : InjectionContext, creator : (selector : Selector) => any) : any[] => {
  const params : any[] = [];
  injectionContext.params.forEach((selector : Selector, index : number) => {
    params.splice(index, 0, creator(selector));
  });
  return params;
};

export const syncPromise = () : Promise<any> => {
  return {
    then(onfulfilled? : ((value : any) => any | PromiseLike<any>) | undefined | null, onrejected? : ((reason : any) => any | PromiseLike<any>) | undefined | null) : Promise<any> {
      return onfulfilled(undefined);
    },
    catch(onrejected? : ((reason : any) => any | PromiseLike<any>) | undefined | null) : Promise<any> {
      return onrejected(undefined);
    },
    get [Symbol.toStringTag]() {
      return "SyncPromise";
    }
  };
};
