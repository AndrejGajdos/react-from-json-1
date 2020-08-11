import * as React from "react";

export interface Component {
  type: string;
  props: object;
}

interface ComponentLookupProps {
  componentType: string;
  componentIndex: number;
  propIndex?: number;
}

export interface ComponentLookup {
  props: ComponentLookupProps;
}

export interface WithDefault {
  default?: any;
}

export interface ReactFromJSONProps<
  MappingType = object,
  ComponentsType = object
> {
  components?: ComponentsType;
  entry: Component | any;
  mapProp?: (obj: any) => any;
  mapping: MappingType & WithDefault;
}

interface ReactFromJSONState {
  counter: object;
}

/*
 * Walk a component tree and recursively render it.
 */
class ReactFromJSON<
  MappingType = object,
  ComponentsType = object
> extends React.Component<ReactFromJSONProps<MappingType, ComponentsType>> {
  public internalMapping: object = {};

  public state: ReactFromJSONState = {
    counter: {},
  };

  constructor(props: any) {
    super(props);

    this.internalMapping = {
      ComponentLookup: this.ComponentLookup,
    };
  }

  ComponentLookup = ({
    componentIndex,
    componentType,
    propIndex,
  }: ComponentLookupProps) => {
    const { components } = this.props;

    if (!components) {
      throw "Detected `ComponentLookup` prop on a component, but `components` is undefined. You need to define `components` if using `ComponentLookup` props.";
    }

    if (!components[componentType]) {
      throw `Detected \`${componentType}\` ComponentLookup, but it's not defined in your \`components\` object.`;
    }

    const component = components[componentType][componentIndex];

    return this.renderComponent({
      ...component,
      props: {
        id: component.id || componentIndex, // Map id to component props if specified on root. Otherwise, use index.
        propIndex: propIndex,
        ...component.props,
      },
    });
  };

  static getDerivedStateFromProps(
    _: ReactFromJSONProps,
    state: ReactFromJSONState
  ) {
    return {
      ...state,
      counter: {},
    };
  }

  resolveProp = (prop: any, propKey?: string, index?: number): any => {
    const { mapProp = (p: any) => p } = this.props;
    const mappedProp = mapProp(prop);

    if (mappedProp === null) {
      return mappedProp;
    } else if (Array.isArray(mappedProp)) {
      return mappedProp.map((prop, index) =>
        this.resolveProp(prop, propKey, index)
      );
    } else if (typeof mappedProp === "object") {
      if (
        // Typeguard
        mappedProp["type"] !== undefined &&
        mappedProp["props"] !== undefined
      ) {
        const component: Component = mappedProp;

        return this.renderComponent(component, propKey, index);
      }
    }

    return mappedProp;
  };

  getNextKey(type: string, propIndex?: number) {
    this.state.counter[type] = this.state.counter[type] || 0;
    const propIndexKey =
      typeof propIndex !== "undefined" ? `_${propIndex}` : "";
    return `${type}_${this.state.counter[type]++}${propIndexKey}`;
  }

  renderComponent(
    component: Component | any,
    propKey?: string,
    propIndex?: number
  ) {
    const { mapping } = this.props;
    const { type, props } = component;
    const resolvedProps = {};
    const key = this.getNextKey(type, propIndex);

    const childPropKeys = Object.keys(props);

    for (let index = 0; index < childPropKeys.length; index++) {
      const childPropKey = childPropKeys[index];
      const prop = props[childPropKey];

      resolvedProps[childPropKey] = this.resolveProp(prop, childPropKey);
    }

    const MappedComponent =
      this.internalMapping[type] || mapping[type] || mapping.default;

    if (typeof MappedComponent === "undefined") {
      return React.createElement(type, {
        key: key,
        propIndex: propIndex,
        propKey: propKey,
        _type: type,
        ...resolvedProps,
      });
    }

    return (
      <MappedComponent
        key={key}
        propIndex={propIndex}
        propKey={propKey}
        _type={type}
        {...resolvedProps}
      />
    );
  }

  render() {
    const { entry } = this.props;

    return <>{this.resolveProp(entry)}</>;
  }
}

export default ReactFromJSON;
