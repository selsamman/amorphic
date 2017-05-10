import {SupertypeSession} from "supertype";
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any
    withoutChangeTracking (callback : Function) {};
    __dictionary__ : any;
    getClasses () : any {};
}

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {

    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}
