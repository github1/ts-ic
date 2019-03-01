/* tslint:disable:no-parameter-reassignment */
import {ICCreator, Selector} from './interfaces';
import {FactoryInjectable, Registrator, typeRegistrator} from './injectable';
import {createParams} from './util';

export const CONSTRUCTOR_KEY = '@@__constructor';

export interface ParameterInjectionContext {
  params : Map<number, Selector>;
}

export const classParameterInjectionContext : Map<any, Map<string | symbol, ParameterInjectionContext>> =
  new Map<any, Map<string | symbol, ParameterInjectionContext>>();

export function inject(selector : Selector) {
  function decorator(
    target : any,
    propertyKey : string | symbol,
    parameterIndexOrPropertyDescriptor : number | TypedPropertyDescriptor<any>
  ) {
    let injectionContext : ParameterInjectionContext;
    let parameterIndex : number = -1;
    let typedPropertyDescriptor : TypedPropertyDescriptor<any>;
    const isParameterDecorator : boolean = typeof parameterIndexOrPropertyDescriptor === 'number';
    if (isParameterDecorator) {
      parameterIndex = parameterIndexOrPropertyDescriptor as number;
      let targetSelector : Selector = target;
      if (typeof target === 'function') {
        targetSelector = target.name;
        propertyKey = CONSTRUCTOR_KEY;
      }
      if (!classParameterInjectionContext.has(targetSelector)) {
        classParameterInjectionContext.set(targetSelector, new Map<string | symbol, ParameterInjectionContext>());
      }
      const parameterParameterInjectionContext : Map<string | symbol, ParameterInjectionContext>
        = classParameterInjectionContext.get(targetSelector);
      if (!parameterParameterInjectionContext.has(propertyKey)) {
        parameterParameterInjectionContext.set(propertyKey, {
          params: new Map<number, Selector>()
        });
      }
      injectionContext = parameterParameterInjectionContext.get(propertyKey);
      if (injectionContext !== undefined) {
        injectionContext.params.set(parameterIndex, selector);
      }
    } else {
      typedPropertyDescriptor = parameterIndexOrPropertyDescriptor as TypedPropertyDescriptor<any>;

      if (!typeRegistrator.has(target.constructor)) {
        typeRegistrator.set(target.constructor, new Registrator());
      }
      const registrator : Registrator = typeRegistrator.get(target.constructor);

      if (classParameterInjectionContext.has(target)
        && classParameterInjectionContext
          .get(target)
          .has(propertyKey)) {
        registrator.include(selector, new FactoryInjectable((creator : ICCreator) => {
          return createParams(classParameterInjectionContext
            .get(target)
            .get(propertyKey), creator)
            .then((params : any[]) => {
              return typedPropertyDescriptor.value.apply(
                this, // tslint:disable-line:no-invalid-this
                params);
            });
        }));
      } else {
        registrator.include(selector, new FactoryInjectable(() => target[propertyKey]()));
      }
    }
  }

  return decorator;
}
