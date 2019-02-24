// import {create, Inject, register, factory} from './spike';
import { Inject } from './inject';
import { IC } from './ic';

describe('Inject', () => {
  it('injects with scopes',  () => {
    IC.register(String, 'aString');
    IC.register('str2', 'aString2');
    expect(IC.wire<Something>(Something).value).toBe('aString');
    IC.scope(() => {
      IC.register(String, 'bString');
      expect(IC.wire<Something>(Something).value).toBe('bString');
    });
    expect(IC.wire<Something>(Something).value).toBe('aString');
  });
  it('injects with configuration classes', () => {
    expect(IC.with(Config).wire<Something2>(Something2).value).toBe('theFoo');
    IC.scope(() => {
      IC.register('foo', 'anotherFoo');
      expect(IC.wire<Something2>(Something2).value).toBe('anotherFoo');
    });
    expect(IC.wire<Something2>(Something2).value).toBe('theFoo');
  });
});

class Config {
  @Inject('foo')
  public foo() {
    return 'theFoo';
  }

  @Inject('b')
  public something(@Inject('foo') foo: string) {
    return foo;
  }
}

class Something {
  public value : string;
  public value2 : string;

  constructor(@Inject(String) value : string, @Inject('str2') value2: string) {
    this.value = value;
    this.value2 = value2;
  }
}

class Something2 {
  public value : string;

  constructor(@Inject('b') value : string) {
    this.value = value;
  }
}
