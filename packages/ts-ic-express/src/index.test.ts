import {inject} from '@github1/ts-ic';
import {getPortPromise} from 'portfinder';
import * as express from 'express';
import {Application} from 'express';
import {Server} from 'http';

describe('handlers', () => {
  let app : Application;
  let server : Server;
  beforeEach(() => {
    return getPortPromise().then((port : number) => {
      return new Promise((resolve) => {
        app = express();
        server = app.listen(port, () => {
          resolve();
        });
      });
    });
  });
  afterEach(() => server.close());
  it('', () => {
    app.get('/foo', () => {});

  });
});
