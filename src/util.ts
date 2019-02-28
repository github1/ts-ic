import {
  InjectionContext,
  Selector,
  ICCreator,
} from './interfaces';

export const createParams = (injectionContext : InjectionContext, creator : ICCreator) : Promise<any[]> => {
  const params : any[] = [];
  injectionContext.params.forEach((selector : Selector, index : number) => {
    params.splice(index, 0, creator.create(selector));
  });
  return Promise.all(params);
};
