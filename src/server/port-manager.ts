import getPort from 'get-port';

export class PortManager {
  private startPort: number;
  private endPort: number;
  private allocatedPorts: Set<number> = new Set();

  constructor(startPort: number, endPort: number) {
    this.startPort = startPort;
    this.endPort = endPort;
  }

  async allocate(): Promise<number> {
    const port = await getPort({
      port: this.getAvailablePortRange(),
    });

    if (port < this.startPort || port > this.endPort) {
      throw new Error(`No available ports in range ${this.startPort}-${this.endPort}`);
    }

    this.allocatedPorts.add(port);
    return port;
  }

  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  private getAvailablePortRange(): number[] {
    const ports: number[] = [];
    for (let p = this.startPort; p <= this.endPort; p++) {
      if (!this.allocatedPorts.has(p)) {
        ports.push(p);
      }
    }
    return ports;
  }
}
