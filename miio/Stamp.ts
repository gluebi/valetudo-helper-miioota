interface StampOptions {
    val?: number;
}

export default class Stamp {
    val?: number;
    time: number;

    constructor(options: StampOptions) {
        this.val = options.val;
        this.time = Date.now();
    }

    isValid(): boolean {
        const stampAge = Date.now() - this.time;
        return Boolean(this.val) && stampAge < 120000;
    }

    orNew(): Stamp {
        return this.isValid() ? this : Stamp.new();
    }

    static new(): Stamp {
        return new Stamp({ val: Math.floor(Date.now() / 1000) });
    }
}
