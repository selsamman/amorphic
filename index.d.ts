export {Supertype} from 'supertype';
export {Persistable, ContainsPersistable, Persistor} from 'persistor';
export {Remoteable, amorphicStatic} from './lib/utils/remoteable';
export {Bindable} from 'amorphic-bindster';
import {Persistor} from 'persistor';

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
