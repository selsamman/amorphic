import {SupertypeSession, SupertypeLogger} from 'supertype';
import {Persistor} from 'Persistor';
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any
    withoutChangeTracking (callback : Function) {};
    config : any;
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
    static createTransientObject(callback : any) {};
    __transient__ : any
}

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}
