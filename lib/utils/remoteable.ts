import {SupertypeSession} from 'supertype';
import {Persistor} from 'Persistor';
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any
    withoutChangeTracking (callback : Function) {};
    config : any;
}
export class amorphicStatic extends Persistor {
}

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}
