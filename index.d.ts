export {Supertype} from 'supertype';
export {Persistable, Persistor} from 'persistor';
export {Remoteable} from './lib/utils/remoteable';
import {Persistor} from 'persistor';

export class Amorphic extends Persistor {
    static create () : Amorphic;
    connect (configDirectory, schemaDirectory?)
}

export declare var Config : any;

export function remote(props?);
export function property(props?: Object);
export function supertypeClass(target?: Function);
