export const generateBenchObject = () => ({
	id: 1000001,
	name: 'Complex Structure',
	meta: {
		created: '2024-01-01T12:00:00Z',
		modified: '2024-03-25T08:00:00Z',
		tags: ['large', 'nested', 'benchmark']
	},
	data: {
		level1: {
			level2: {
				level3: {
					level4: {
						level5: {
							level6: {
								level7: {
									level8: {
										level9: {
											value: 12345,
											text: 'Deeply nested value',
											status: true,
											numbers: Array.from({ length: 1000 }, (_, i) => i), // 1000 numbers
											objects: Array.from({ length: 500 }, (_, i) => ({
												id: i,
												flag: i % 2 === 0
											}))
										}
									}
								}
							}
						}
					}
				}
			}
		}
	},
	settings: {
		appearance: {
			theme: 'dark',
			fontSize: 14,
			layout: 'grid'
		},
		privacy: {
			tracking: false,
			history: true
		}
	}
});

export const applyChanges = (
	newObject: ReturnType<typeof generateBenchObject>
) => {
	newObject.meta.modified = '2025-03-28T10:30:00Z'; // Modify timestamp
	newObject.data.level1.level2.level3.level4.level5.level6.level7.level8.level9.value = 67890; // Modify deep value
	newObject.settings.appearance.fontSize = 16; // Change font size
	newObject.settings.privacy.history = false; // Change boolean flag
	newObject.data.level1.level2.level3.level4.level5.level6.level7.level8.level9.numbers[500] = 99999; // Modify array value
	newObject.data.level1.level2.level3.level4.level5.level6.level7.level8.level9.objects.push(
		{ id: 500, flag: true }
	); // Add to array

	return newObject;
};
