# valetudo-helper-miioota

![example](https://user-images.githubusercontent.com/974410/162240051-e27cb05b-0fda-4ce0-a6b6-4809a5935f63.png)


valetudo-helper-miioota is a small utility that can be used to install rooted firmwares onto some older robots.

Those being:
- Roborock S5 (non Max!!)
- Roborock V1 also known as the Xiaomi Mi Robot Vacuum (made before 2020-03)

It comes as a single binary with no additional dependencies and requires only experience with a terminal.

Simply download the latest binary [from the releases section](https://github.com/gluebi/valetudo-helper-miioota/releases)
and execute it in a terminal/powershell window.

Download the file matching your platform:

- `valetudo-helper-miioota-mac-arm64` — macOS Apple Silicon (M1/M2/M3)
- `valetudo-helper-miioota-amd64` — Linux x64
- `valetudo-helper-miioota-armv7` — Linux ARM
- `valetudo-helper-miioota.exe` — Windows

On macOS, make the binary executable and remove the quarantine flag if Gatekeeper blocks it:

```bash
chmod +x valetudo-helper-miioota-mac-arm64
xattr -dr com.apple.quarantine ./valetudo-helper-miioota-mac-arm64
./valetudo-helper-miioota-mac-arm64 install-firmware <firmware.pkg>
```


## Valetudo helpers

Valetudo helpers are a series of small standalone self-contained single-purpose single-file tools built to make
usage and/or installation of Valetudo a bit easier.

As with everything Valetudo, some intermediate computer skills are required. You should know what a network is,
what HTTP is, how a terminal works and that kind of stuff.
Please understand that it's not feasible for this or any open source project to provide basic computer lessons.
