/* tslint:disable:no-parameter-reassignment */
import {
  ICCreator,
  InjectionContext,
  Selector,
  typeRegistrator
} from './interfaces';
import {
  FactoryInjectable,
  Registrator,
} from './injectable';
import {createParams} from './util';

export const CONSTRUCTOR_KEY = '@@__constructor';

export const classParameterInjectionContext : Map<any, Map<string | symbol, InjectionContext>> =
  new Map<any, Map<string | symbol, InjectionContext>>();

export function inject(selector : Selector) {
  function decorator(
    target : any,
    propertyKey : string | symbol,
    parameterIndexOrPropertyDescriptor : number | TypedPropertyDescriptor<any>
  ) {
    let injectionContext : InjectionContext;
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
        classParameterInjectionContext.set(targetSelector, new Map<string | symbol, InjectionContext>());
      }
      const parameterInjectionContext : Map<string | symbol, InjectionContext> = classParameterInjectionContext.get(targetSelector);
      if (!parameterInjectionContext.has(propertyKey)) {
        parameterInjectionContext.set(propertyKey, {
          params: new Map<number, Selector>()
        });
      }
      injectionContext = parameterInjectionContext.get(propertyKey);
      if (injectionContext !== undefined) {
        injectionContext.params.set(parameterIndex, selector);
      }
    } else {
      typedPropertyDescriptor = parameterIndexOrPropertyDescriptor as TypedPropertyDescriptor<any>;

      if (!typeRegistrator.has(target.constructor)) {
        typeRegistrator.set(target.constructor, new Registrator());
      }
      const registrator: Registrator = typeRegistrator.get(target.constructor);

      if (classParameterInjectionContext.has(target)
        && classParameterInjectionContext
          .get(target)
          .has(propertyKey)) {
        registrator.include(selector, new FactoryInjectable((creator : ICCreator) => {
          return createParams(classParameterInjectionContext
            .get(target)
            .get(propertyKey), creator).then((params : any[]) => {
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
