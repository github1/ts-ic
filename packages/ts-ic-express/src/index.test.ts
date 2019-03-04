import {
  inject,
  register,
  resetAll
} from '@github1/ts-ic';
import {getPortPromise} from 'portfinder';
import * as express from 'express';
import {Application} from 'express';
import {Server} from 'http';
import * as fetch from 'isomorphic-fetch';
import handler from './';

describe('handlers', () => {
  let app : Application;
  let server : Server;
  let port : number;
  beforeEach(() => {
    return getPortPromise().then((foundPort : number) => {
      port = foundPort;
      return new Promise((resolve) => {
        app = express();
        server = app.listen(port, () => {
          resolve();
        });
      });
    });
  });
  afterEach(() => {
    resetAll();
    server.close();
  });
  it('', async () => {
    const dep = jest.fn();
    register('dep', dep);
    register('dep2', 'dep2-value');
    handler(app, Handler);
    const json = await (await fetch(`http://localhost:${port}/handler/someAction`)).json();
    expect(dep).toHaveBeenCalled();
    expect(json).toEqual([{
      name: 'setResult1',
      args: ['hello']
    }, {
      name: 'setResult2',
      args: ['world']
    }]);
  });
});

class Handler {
  constructor(@inject('dep') private dep : Function) {
  }

  public async someAction(
    @inject('dep2') dep2 : string,
    @inject('output') output : Output) : Promise<void> {
    this.dep();
    await output
      .setResult1('hello');
    await delay(100);
    await output
      .setResult2('world');
  }
}

interface Output {
  setResult1(value : string): Promise<void>;
  setResult2(value : string): Promise<void>;
}

const delay = (ms) => new Promise((resolve) => {
  setTimeout(() => resolve(), ms);
});
