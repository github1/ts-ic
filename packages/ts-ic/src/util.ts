import {ICCreator, Selector} from './interfaces';
import {ParameterInjectionContext} from './inject';

export const createParams = (parameterInjectionContext : ParameterInjectionContext, creator : ICCreator) : Promise<any[]> => {
  const params : any[] = [];
  parameterInjectionContext.params.forEach((selector : Selector, index : number) => {
    params.splice(index, 0, creator.create(selector));
  });
  return Promise.all(params);
};
