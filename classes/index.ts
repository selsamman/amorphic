import {Persistable} from 'persistor';
import {Supertype} from 'supertype';
import {Remoteable} from '../';
import {Bindable} from 'amorphic-bindster';

export class Persistent extends Persistable(Supertype) {};
export class IsomorphicQuery extends Remoteable (Persistable(Supertype)) {};
export class AppController extends Remoteable(Bindable(Supertype)) {};
export class SubController extends Remoteable(Supertype) {};
export class Everything extends Persistable(Remoteable(Bindable(Supertype))) {};
