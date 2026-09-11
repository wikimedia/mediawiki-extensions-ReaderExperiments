<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Request\WebRequest;

interface MediaWikiApi {
	public function supports( WebRequest $request ): bool;

	/**
	 * @throws Exception
	 */
	public function execute( WebRequest $request ): array;
}
