//import SortedArray from './sortedArray';
import Version from './version';

class VersionVector {

  constructor(siteId) {

    this.versions = []
    this.localVersion = new Version(siteId);
    this.versions.push(this.localVersion);
  }

  increment() {
    this.localVersion.counter++;
    console.log("increment:",this.localVersion)
  }

  update(incomingVersion) {
    const existingVersion = this.versions.find(version => incomingVersion.siteId === version.siteId);

    if (!existingVersion) {
      const newVersion = new Version(incomingVersion.siteId);

      newVersion.update(incomingVersion);
      this.versions.push(newVersion);
    } else {
      existingVersion.update(incomingVersion);
    }
  }

  // check if incoming remote operation has already been applied to our crdt
  hasBeenApplied(incomingVersion) {
    const localIncomingVersion = this.getVersionFromVector(incomingVersion);
    const isIncomingInVersionVector = !!localIncomingVersion;

    if (!isIncomingInVersionVector) return false;

    const isIncomingLower = incomingVersion.counter <= localIncomingVersion.counter;
    const isInExceptions = localIncomingVersion.exceptions.includes(incomingVersion.counter);

    return isIncomingLower && !isInExceptions;
  }

  getVersionFromVector(incomingVersion) {
    return this.versions.find(version => version.siteId === incomingVersion.siteId);
  }

  getLocalVersion() {
    console.log("GET local version-",this.localVersion.siteId)
    return {
      siteId: this.localVersion.siteId,
      counter: this.localVersion.counter
    };
  }
}

export default VersionVector;
