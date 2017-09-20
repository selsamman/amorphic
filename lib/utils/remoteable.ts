import {SupertypeSession, SupertypeLogger} from 'supertype';
import {Persistor} from 'persistor';
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any;
    withoutChangeTracking (callback : Function) {};
    config : any;
    __transient__ : any;
    __changeTracking__: any;
    reqSession: any;
    expireSession(): any {};
}
export class amorphicStatic {
    static logger : SupertypeLogger;
    static config : any;
    static beginDefaultTransaction() : any {}
    static beginTransaction(nodefault? : boolean) : any {}
    static endTransaction(persistorTransaction?, logger?) : any {}
    static begin (isdefault?) : any {}
    static end (persistorTransaction?, logger?) : any {};
    static commit (options?) : any {};
    static createTransientObject(callback : any) : any {};
    static __transient__ : any;
    static __dictionary__: any;
    static debugInfo: any;
    static reqSession: any;
    static getClasses(): any {};
    static syncAllTables(): any {};
    static getInstance(): any {};
}

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}