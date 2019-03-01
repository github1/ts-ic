import {wire} from '@github1/ts-ic';
import {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';

export default function (app : Application, type : any) : Application {
  const requestHandler : RequestHandler = (req : Request, res : Response, next : NextFunction) => {
    wire(type)
      .then((handler : any) => {
        const operation : string = req.params.operation;
        const promise : Promise<any> = handler[operation]();
        promise
          .then(() => {
            res.send({});
          })
          .catch((err : Error) => {
            res.status(500).send({});
          });
      });
  };
  app.use(`/${type.constructor.name}/:operation`, requestHandler);
  return app;
}
