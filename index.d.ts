import {Supertype} from 'supertype';
import {Persistable, Persistor} from 'persistor';
import {Remoteable} from './lib/utils/remoteable';
import {Bindable} from 'amorphic-bindster';

export {amorphicStatic} from './lib/utils/remoteable';
export {Supertype} from 'supertype';
export {ContainsPersistable, Persistable} from 'persistor';

export class IsomorphicQuery extends Remoteable(Persistable(Supertype)) {}
export class Persistent extends Persistable(Supertype) {}
export class AppController extends Remoteable(Bindable(Supertype)) {}
export class SubController extends Remoteable(Supertype) {}
export class Everything extends Persistable(Remoteable(Bindable(Supertype))) {}

// This class is for Amorphic unit tests
export class Amorphic extends Persistor {
    static create () : Amorphic;
    connect (configDirectory, schemaDirectory?)
    incomingIp: string;
}

export declare var Config : any;
export function remote(props?);
export function property(props?: Object);
export function supertypeClass(props?: any);
