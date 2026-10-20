import type { LocationDetails } from "@/types/event";
import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./LocationPicker.module.css";
import Dropdown from "../Dropdown";
import { MapPin, Link as LinkIcon, Plus, Minus } from "lucide-react";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  MapControl,
  ControlPosition,
  ColorScheme,
} from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY, MAP_ID } from "@/constants/config";

interface LocationPickerProps {
  locationType: "online" | "offline" | "hybrid";
  locationDetails: LocationDetails | null;
  virtualLink: string;
  onChangeLocationType: (type: "online" | "offline" | "hybrid") => void;
  onChangeLocationDetails: (val: LocationDetails | null) => void;
  onChangeVirtualLink: (val: string) => void;
}

interface PlaceSuggestion {
  placeId: google.maps.places.PlacePrediction["placeId"];
  description: string;
}

const TYPE_OPTIONS = [
  { label: "Offline", value: "offline", desc: "Physical Location" },
  { label: "Online", value: "online", desc: "Virtual Event" },
  { label: "Hybrid", value: "hybrid", desc: "Physical + Virtual" },
];

const defaultCenter = {
  lat: 10.004675902169992, // Default to Kochi
  lng: 76.30637841229771,
};

function formatDetails(results: google.maps.GeocoderResult[]) {
  let city = "";
  let state = "";
  let country = "";
  if (results[0].address_components) {
    results[0].address_components.forEach((component) => {
      if (component.types.includes("locality")) {
        city = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
      }
    });
  }
  return {
    address: results[0].formatted_address,
    city,
    state,
    country,
  };
}

function MapController({
  mapCenter,
  zoomAction,
}: {
  mapCenter: { lat: number; lng: number } | null;
  zoomAction: "in" | "out" | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapCenter) return;
    map.panTo(mapCenter);
  }, [map, mapCenter]);

  useEffect(() => {
    if (!map || !zoomAction) return;
    map.setZoom((map.getZoom() || 15) + (zoomAction === "in" ? 1 : -1));
  }, [map, zoomAction]);

  return null;
}

function LocationPickerInner({
  locationType,
  locationDetails,
  virtualLink,
  onChangeLocationType,
  onChangeLocationDetails,
  onChangeVirtualLink,
}: LocationPickerProps) {
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");

  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(() =>
    locationDetails?.lat !== undefined && locationDetails?.lng !== undefined
      ? { lat: locationDetails.lat, lng: locationDetails.lng }
      : null,
  );
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(() =>
    locationDetails?.lat !== undefined && locationDetails?.lng !== undefined
      ? { lat: locationDetails.lat, lng: locationDetails.lng }
      : null,
  );
  const [zoomAction, setZoomAction] = useState<"in" | "out" | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(
    locationDetails?.address || locationDetails?.name || "",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const [previousDetails, setPreviousDetails] = useState(locationDetails);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (locationDetails !== previousDetails) {
    setPreviousDetails(locationDetails);
    setSearchValue(locationDetails?.address || locationDetails?.name || "");
    const pos =
      locationDetails?.lat !== undefined && locationDetails.lng !== undefined
        ? { lat: locationDetails.lat, lng: locationDetails.lng }
        : null;
    setMarkerPosition(pos);
    setMapCenter(pos);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSuggestions([]); // Clear suggestions on blur
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!input || !placesLib || !placesLib.AutocompleteSuggestion) {
        if (isMounted.current) setSuggestions([]);
        return;
      }

      try {
        const request = { input };
        const response =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );

        if (!isMounted.current) return;

        if (!response.suggestions || response.suggestions.length === 0) {
          setSuggestions([]);
          return;
        }

        const parsed = response.suggestions.map((s) => {
          const placePrediction = s.placePrediction;
          return {
            placeId: placePrediction?.placeId as string,
            description: placePrediction?.text?.text as string,
          };
        });
        setSuggestions(parsed);
      } catch (error) {
        if (isMounted.current) {
          console.error("Failed to fetch places suggestions:", error);
          setSuggestions([]);
        }
      }
    },
    [placesLib],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen && searchValue) {
        fetchSuggestions(searchValue);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchValue, isOpen, fetchSuggestions]);

  const handleSelect = (placeId: string, description: string) => {
    setSearchValue(description);
    setSuggestions([]);
    setIsOpen(false);

    if (geocodingLib) {
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ placeId }, (results, status) => {
        if (!isMounted.current) return;

        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          const newPos = { lat, lng };
          setMarkerPosition(newPos);
          setMapCenter(newPos);

          const { city, state, country } = formatDetails(results);

          if (placesLib && placeId) {
            const placesService = new placesLib.Place({
              id: placeId,
            });
            placesService
              .fetchFields({
                fields: ["displayName"],
              })
              .then(() => {
                if (!isMounted.current) return;
                const name = placesService.displayName || "";
                const newData = {
                  name: name || "",
                  address: results[0].formatted_address,
                  placeId: placeId,
                  lat,
                  lng,
                  city,
                  state,
                  country,
                };
                setPreviousDetails(newData);
                onChangeLocationDetails(newData);
              });
          } else {
            const newData = {
              name: "",
              address: results[0].formatted_address,
              placeId: placeId,
              lat,
              lng,
              city,
              state,
              country,
            };
            setPreviousDetails(newData);
            onChangeLocationDetails(newData);
          }
        } else {
          setPreviousDetails({ address: description });
          onChangeLocationDetails({ address: description });
        }
      });
    } else {
      setPreviousDetails({ address: description });
      onChangeLocationDetails({ address: description });
    }
  };

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail.latLng) return;

      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      const newPos = { lat, lng };

      setMarkerPosition(newPos);
      setMapCenter(newPos);

      if (geocodingLib) {
        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ location: newPos }, (results, status) => {
          if (!isMounted.current) return;

          if (status === "OK" && results && results[0]) {
            const address = results[0].formatted_address;
            const placeId = results[0].place_id;
            setSearchValue(address);

            const { city, state, country } = formatDetails(results);

            if (placesLib && placeId) {
              const placeObj = new placesLib.Place({
                id: placeId,
              });
              placeObj
                .fetchFields({
                  fields: ["displayName"],
                })
                .then(() => {
                  if (!isMounted.current) return;
                  const name = placeObj.displayName || "";
                  const newData = {
                    name: name || "",
                    address,
                    placeId,
                    lat,
                    lng,
                    city,
                    state,
                    country,
                  };
                  setPreviousDetails(newData);
                  onChangeLocationDetails(newData);
                });
            } else {
              const newData = {
                name: "",
                address,
                placeId,
                lat,
                lng,
                city,
                state,
                country,
              };
              setPreviousDetails(newData);
              onChangeLocationDetails(newData);
            }
          }
        });
      }
    },
    [geocodingLib, placesLib, onChangeLocationDetails],
  );

  const handleZoomIn = () => {
    setZoomAction("in");
    setTimeout(() => setZoomAction(null), 50);
  };

  const handleZoomOut = () => {
    setZoomAction("out");
    setTimeout(() => setZoomAction(null), 50);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <Dropdown
        options={TYPE_OPTIONS}
        value={locationType}
        onChange={(val) =>
          onChangeLocationType(
            val === "online" || val === "hybrid" ? val : "offline",
          )
        }
        className={styles.typeDropdown}
        alignSelf="flex-end"
        popoverAlign="right"
      />

      <div className={styles.inputsWrapper}>
        {(locationType === "offline" || locationType === "hybrid") && (
          <>
            <div className={styles.inputWrapper}>
              <div className={styles.inputField}>
                <div className={styles.inputIcon}>
                  <MapPin size={16} />
                </div>
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={isOpen && suggestions.length > 0}
                  aria-controls="location-suggestions"
                  aria-autocomplete="list"
                  placeholder="Search physical address..."
                  value={searchValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchValue(val);
                    // Emit a proper JSON object to prevent downstream JSON parse errors
                    const newData = {
                      name: "",
                      address: val,
                      placeId: "",
                      lat: 0,
                      lng: 0,
                    };
                    setPreviousDetails(newData);
                    onChangeLocationDetails(newData);
                  }}
                  onFocus={() => setIsOpen(true)}
                  className={styles.textInput}
                />
              </div>

              {isOpen && searchValue.length > 0 && suggestions.length > 0 && (
                <div
                  id="location-suggestions"
                  role="listbox"
                  className={styles.suggestionsList}
                >
                  {suggestions.map(({ placeId, description }) => (
                    <button
                      key={placeId}
                      role="option"
                      aria-selected="false"
                      className={styles.suggestionItem}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelect(placeId, description);
                      }}
                    >
                      <div className={styles.inputIcon}>
                        <MapPin size={16} />
                      </div>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.mapContainer}>
              <Map
                mapId={MAP_ID}
                style={{ width: "100%", height: "100%" }}
                defaultCenter={defaultCenter}
                defaultZoom={15}
                onClick={handleMapClick}
                disableDefaultUI={true}
                keyboardShortcuts={false}
                colorScheme={ColorScheme.DARK}
              >
                {markerPosition && <AdvancedMarker position={markerPosition} />}
                <MapController mapCenter={mapCenter} zoomAction={zoomAction} />
                <MapControl position={ControlPosition.RIGHT_BOTTOM}>
                  <div className={styles.customZoomControls}>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={handleZoomIn}
                      aria-label="Zoom In"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={handleZoomOut}
                      aria-label="Zoom Out"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                </MapControl>
              </Map>
            </div>
          </>
        )}

        {(locationType === "online" || locationType === "hybrid") && (
          <div className={styles.inputField}>
            <div className={styles.inputIcon}>
              <LinkIcon size={16} />
            </div>
            <input
              type="url"
              placeholder="Virtual event link (e.g. Zoom, Google Meet)"
              value={virtualLink}
              onChange={(e) => onChangeVirtualLink(e.target.value)}
              className={styles.textInput}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LocationPicker(props: LocationPickerProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <LocationPickerInner {...props} />
    </APIProvider>
  );
}
