# Frontend

## Widgets documentation and examples portal

### Documentation and guides

API reference for widgets is found at [docs/widgets-api-reference.md](docs/widgets-api-reference.md).

Documentation and guides can be found in [docs/](docs/)

### Examples portal

In order to see Krateo frontend widgets displayed in a real environment, you can run our examples portal, which loads the [YAML example files](./src/examples/widgets/) referenced in the documentation into a local environment.

To do that, clone this repository, then follow the steps below:

#### **Step 1: Create a Kind Cluster with Krateo**

Follow [this guide](https://docs.krateo.io/how-to-guides/install-krateo/installing-krateo-kind) to create a Kind cluster with the latest version of Krateo installed.

### **Step 2: Start the examples portal**

Run the following command to start the examples portal app locally:

```bash
npm run examples
```

It will be available at [http://localhost:4000/login](http://localhost:4000/login).

Login with:

- **Username:** `admin`  
- **Password:** retrieve it with:
  ```bash
  kubectl get secret admin-password -n krateo-system -o jsonpath="{.data.password}" | base64 -d
  ```

You should now see a sidebar item for each widget, directing you to a dedicated page that contains several examples.

---

## Running Locally

Follow the steps below to run the frontend locally.


### **Step 1: Create a Kind Cluster with Krateo**

Follow [this guide](https://docs.krateo.io/how-to-guides/install-krateo/installing-krateo-kind) to create a Kind cluster with the latest version of Krateo installed.

### **Step 2: Generate CRDs from JSON Schemas**

Install [`krateoctl`](https://github.com/krateoplatformops/krateoctl) (it also needs a Go toolchain in `PATH` and a reachable `GOPROXY`, since it runs `controller-gen`).

Then run the script that uses `krateoctl` to generate CRDs for all `.schema.json` files in the repository:

```bash
npm run generate-crds
```

All generated `.crd.yaml` files will be saved in `scripts/krateoctl-output/` (gitignored build artifacts).

> **Adding widgets?** See [`docs/widget-authoring.md`](docs/widget-authoring.md). Widgets are auto-registered (drop a folder — no `WidgetRenderer` edit). Scaffold one with `npm run scaffold-widget`, or generate a batch from the Ant Design catalog with `npm run gen-antd-widgets`.

### **Step 3: Apply Custom Resources**

Apply all the `.yaml` custom resources defined in the repository with:

```bash
npm run apply-all
```

### **Step 4: Configure `config.json`**

Ensure your project includes the configuration file:

```
./public/config/config.json
```

The file should have this content:

```json
{
  "api": {
    "AUTHN_API_BASE_URL": "http://localhost:30082",
    "SNOWPLOW_API_BASE_URL": "http://localhost:30081",
    "EVENTS_API_BASE_URL": "http://localhost:30083",
    "ROUTES_LOADER": "/call?resource=routesloaders&apiVersion=widgets.templates.krateo.io/v1beta1&name=routes-loader&namespace=krateo-system",
    "EVENTS_PUSH_API_BASE_URL": "http://localhost:30083",
    "INIT": "/call?resource=navmenus&apiVersion=widgets.templates.krateo.io/v1beta1&name=sidebar-nav-menu&namespace=krateo-system"
  },
  "params": {
    "FRONTEND_NAMESPACE": "krateo-system",
    "DELAY_SAVE_NOTIFICATION": "10000"
  }
}
```

### **Step 5: Start the Application**

Run the following command to start the app locally:

```bash
npm run dev
```

The frontend will be available at [http://localhost:4000/login](http://localhost:4000/login).

Login with:

- **Username:** `admin`  
- **Password:** retrieve it with:
  ```bash
  kubectl get secret admin-password -n krateo-system -o jsonpath="{.data.password}" | base64 -d
  ```

## Running on an Existing Cluster

You can also run the frontend locally while connected to an existing cluster.

You’ll need:

- a **username**
- a **password**
- the cluster’s `config.json` file

Copy the cluster’s config into:

```
./public/config/config.remote.json
```

Then run:

```bash
VITE_CONFIG_NAME=remote npm run dev
```

Finally, authenticate using the provided username and password.
