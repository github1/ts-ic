import {
  IC,
  scope,
  StaticInjectable
} from '@github1/ts-ic';
import {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';

export interface Call {
  name : string;
  args : any[]
}

export default function (app : Application, type : any) : Application {
  const requestHandler : RequestHandler = async (req : Request, res : Response, next : NextFunction) => {
    const operation : string = req.params.operation;
    const reqScope : IC = await scope();
    const calls : Call[] = [];
    reqScope.register('output', new StaticInjectable(new Proxy({}, {
      get(target : any, key : any) {
        if (key !== 'then') {
          return function () {
            calls.push({name: key, args: Array.from(arguments)});
            return Promise.resolve();
          };
        }
        return target[key];
      }
    })));
    const proxied = await reqScope.proxy(type);
    const promise : Promise<any> = proxied[operation]();
    await promise;
    res.send(calls);
  };
  app.use(`/${type.name.toLowerCase()}/:operation`, requestHandler);
  return app;
}
