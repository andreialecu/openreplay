import { message } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Loader, NoContent, Pagination } from 'UI';

import withPermissions from '../../hocs/withPermissions';
import EmptyPage from './EmptyPage';
import SpotListItem from './SpotListItem';
import SpotsListHeader from './SpotsListHeader';

function SpotsList() {
  const [selectedSpots, setSelectedSpots] = React.useState<string[]>([]);
  const { spotStore } = useStore();

  React.useEffect(() => {
    void spotStore.fetchSpots();
  }, []);

  const onPageChange = (page: number) => {
    spotStore.setPage(page);
    void spotStore.fetchSpots();
  };

  const onDelete = async (spotId: string) => {
    await spotStore.deleteSpot([spotId]);
    setSelectedSpots(selectedSpots.filter((s) => s !== spotId));
  };

  const batchDelete = async () => {
    const deletedCount = selectedSpots.length;
    await spotStore.deleteSpot(selectedSpots);
    setSelectedSpots([]);

    const remainingItemsOnPage = spotStore.spots.length - deletedCount;
    if (remainingItemsOnPage <= 0 && spotStore.page > 1) {
      spotStore.setPage(spotStore.page - 1);
      await spotStore.fetchSpots();
    } else {
      await spotStore.fetchSpots();
    }

    message.success(
      `${deletedCount} Spot${deletedCount > 1 ? 's' : ''} deleted successfully.`
    );
  };

  const onRename = (id: string, newName: string) => {
    return spotStore.updateSpot(id, { name: newName });
  };

  const onVideo = (id: string) => {
    return spotStore.getVideo(id);
  };

  const handleSelectSpot = (spotId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSpots((prev) => [...prev, spotId]);
    } else {
      setSelectedSpots((prev) => prev.filter((id) => id !== spotId));
    }
  };

  const isSpotSelected = (spotId: string) => selectedSpots.includes(spotId);

  const clearSelection = () => {
    setSelectedSpots([]);
  };

  const isLoading = spotStore.isLoading;
  const isEmpty = true; //spotStore.total === 0 && spotStore.query === ''
  return (
    <div className={'relative w-full mx-auto'} style={{ maxWidth: 1360 }}>
      <div
        className={
          'flex mx-auto p-2 px-4 bg-white rounded-t-lg shadow-sm w-full z-50 border-b'
        }
      >
        <SpotsListHeader
          onDelete={batchDelete}
          selectedCount={selectedSpots.length}
          onClearSelection={clearSelection}
          isEmpty={isEmpty}
        />
      </div>

      <div className={'pb-4 w-full'}>
        {isEmpty ? (
          isLoading ? (
            <Loader />
          ) : (
            <EmptyPage />
          )
        ) : (
          <>
            <NoContent
              show={spotStore.spots.length === 0}
              title={'No spots found'}
              subtext={'Try to search for something else'}
            >
              <div
                className={'py-2 border-gray-lighter grid grid-cols-3 gap-6'}
              >
                {spotStore.spots.map((spot) => (
                  <SpotListItem
                    key={spot.spotId}
                    spot={spot}
                    onDelete={() => onDelete(spot.spotId)}
                    onRename={onRename}
                    onVideo={onVideo}
                    onSelect={(checked: boolean) =>
                      handleSelectSpot(spot.spotId, checked)
                    }
                    isSelected={isSpotSelected(spot.spotId)}
                  />
                ))}
              </div>
            </NoContent>
            <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
              <div>
                Showing{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit +
                    spotStore.spots.length}
                </span>{' '}
                of{' '}
                <span className="font-medium">
                  {numberWithCommas(spotStore.total)}
                </span>{' '}
                spots.
              </div>
              <Pagination
                page={spotStore.page}
                total={spotStore.total}
                onPageChange={onPageChange}
                limit={spotStore.limit}
                debounceRequest={500}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default withPermissions(['SPOT'])(observer(SpotsList));
