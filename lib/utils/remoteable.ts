type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession {
    connectSession : any
    withoutChangeTracking (callback : Function) {};
}

export function Remoteable<BC extends Constructable<{}>>(Base: BC) {

    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession

    };
}
