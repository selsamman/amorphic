import {Supertype} from 'supertype';
import {Persistable, Persistor} from 'persistor';
import {Remoteable} from './lib/utils/remoteable';
import {Bindable} from 'amorphic-bindster';

export {amorphicStatic} from './lib/utils/remoteable';
export {ContainsPersistable} from 'persistor';

export class Persistent extends Persistable(Supertype){}  // classes that have no business in any browser
export class Serializable extends Supertype {} // classes used in APIs but are serializable
export class AppController extends Remoteable(Bindable(Supertype)) {} // main controllers
export class SubController extends Remoteable(Supertype) {} // controllers hanging off main controller
export class Everything extends Persistable(Remoteable(Bindable(Supertype))) {} // Doesn't match regex

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
